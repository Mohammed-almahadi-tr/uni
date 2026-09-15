Imports System.Data.SqlClient
Imports EgyCurr

Public Class frmRegistrationForm

    Sub Clear()
        Me.txtStName.Clear()
        Me.CombProgram.SelectedItem = Nothing
        Me.txtClassroom.Clear()
        Me.txtFileNo.Clear()
        Me.txtUniversityID.Clear()
        Me.txtPlaceofBirth.Clear()
        Me.DTPBirthDate.Value = Now
        Me.txtParent.Clear()
        Me.txtParentJob.Clear()
        Me.txtRelevant.Clear()
        Me.txtParentAddress.Clear()
        Me.txtCloseRelativesAddress.Clear()
        Me.txtCloseRelatives.Clear()
        Me.txtCloseRelativesPhone.Clear()
        Me.CombMedicalExamination.SelectedItem = Nothing
        Me.txtReasonofIndecent.Clear()
        Me.txtDocName.Clear()
        Me.txtUniID.Clear()
        Me.CombTypeofCertificate.SelectedItem = Nothing
        Me.CombTypeofAdmission.SelectedItem = Nothing
        Me.txtTuitionFees.Clear()
        Me.txtWrTuitionFees.Clear()
        Me.txtRegFees.Clear()
        Me.txtWrRegFees.Clear()
        Me.txtAccTuitionFees.Clear()
        Me.txtAccWrTuitionFees.Clear()
        Me.txtAccRegFees.Clear()
        Me.txtAccWRegFees.Clear()
        Me.txtInvoiceNo.Clear()
        Me.DTPInvoiceDate.Value = Now
        Me.txtAccName.Clear()
        Me.txtRegName.Clear()
    End Sub

    Sub FillPrograms()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("select Distinct College From Colleges where College is not null ", cnn)
            Dim Reader As SqlDataReader

            Me.CombProgram.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader

            While Reader.Read
                Me.CombProgram.Items.Add(Reader.Item(0))
            End While

            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub frmRegistrationForm_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillPrograms()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Len(Me.txtStName.Text.Trim.Trim) = 0 OrElse Len(Me.txtFileNo.Text.Trim) = 0 OrElse Len(Me.txtUniversityID.Text.Trim) = 0 OrElse _
           Me.CombProgram.SelectedIndex = -1 OrElse Me.CombNationality.Text = "" OrElse Len(Me.txtPlaceofBirth.Text.Trim) = 0 OrElse _
           Len(Me.txtParent.Text.Trim) = 0 OrElse Len(Me.txtParentJob.Text.Trim) = 0 OrElse Len(Me.txtRelevant.Text.Trim) = 0 OrElse _
           Len(Me.txtParentJob.Text.Trim) = 0 OrElse Len(Me.txtParentAddress.Text.Trim) = 0 OrElse Len(Me.txtCloseRelatives.Text.Trim) = 0 _
           OrElse Len(Me.txtCloseRelativesAddress.Text.Trim) = 0 OrElse Len(Me.txtCloseRelativesPhone.Text.Trim) = 0 Then
            MsgBox("الرجاء ملء جميع بيانات الطالب الأساسية")
        Else

            Try
                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand()
                Dim Trans As SqlTransaction
                Dim SNo As Integer

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans

                cmd.CommandText = "Insert Into StdProf (stdName,Program,semtir,FileNo,UnivID,Nationality,PlaceofBirth," & _
                                  "BirthDate,NextofKing,JobofNextofKing,Relevant,NextofKingAddress,CloseRelatives,CloseRelativesAddress," & _
                                  "CloseRelativesPhone,MedicalExamination,ReasonofIndecent,DocName,DateofMedicalExamination,TypeofCertificate," & _
                                  "TypeofAdmission,TuitionFees,WrTuitionFees,RegFees,WrRegFees,InvoiceNo,InvoiceDate,AccName,RegName,SavedUser) " & _
                                  "Values (@stdName,@Program,@semtir,@FileNo,@UnivID,@Nationality,@PlaceofBirth,@BirthDate,@NextofKing," & _
                                  "@JobofNextofKing,@Relevant,@NextofKingAddress,@CloseRelatives,@CloseRelativesAddress,@CloseRelativesPhone," & _
                                  "@MedicalExamination,@ReasonofIndecent,@DocName,@DateofMedicalExamination,@TypeofCertificate,@TypeofAdmission," & _
                                  "@TuitionFees,@WrTuitionFees,@RegFees,@WrRegFees,@InvoiceNo,@InvoiceDate,@AccName,@RegName,@SavedUser) Select SCOPE_IDENTITY()"

                'Add values
                cmd.Parameters.AddWithValue("@stdName", Me.txtStName.Text.Trim)
                cmd.Parameters.AddWithValue("@Program", Me.CombProgram.SelectedItem)
                cmd.Parameters.AddWithValue("@semtir", Me.txtClassroom.Text.Trim)
                cmd.Parameters.AddWithValue("@FileNo", Me.txtFileNo.Text.Trim)
                cmd.Parameters.AddWithValue("@UnivID", Me.txtUniversityID.Text.Trim)
                cmd.Parameters.AddWithValue("@Nationality", Me.CombNationality.Text.Trim)
                cmd.Parameters.AddWithValue("@PlaceofBirth", Me.txtPlaceofBirth.Text.Trim)
                cmd.Parameters.AddWithValue("@BirthDate", Me.DTPBirthDate.Value)
                cmd.Parameters.AddWithValue("@NextofKing", Me.txtParent.Text.Trim)
                cmd.Parameters.AddWithValue("@JobofNextofKing", Me.txtParentJob.Text.Trim)
                cmd.Parameters.AddWithValue("@Relevant", Me.txtRelevant.Text.Trim)
                cmd.Parameters.AddWithValue("@NextofKingAddress", Me.txtParentAddress.Text.Trim)
                cmd.Parameters.AddWithValue("@CloseRelatives", Me.txtCloseRelatives.Text.Trim)
                cmd.Parameters.AddWithValue("@CloseRelativesAddress", Me.txtCloseRelativesAddress.Text.Trim)
                cmd.Parameters.AddWithValue("@CloseRelativesPhone", Me.txtCloseRelativesPhone.Text.Trim)
                cmd.Parameters.AddWithValue("@MedicalExamination", Me.CombMedicalExamination.SelectedItem)
                cmd.Parameters.AddWithValue("@ReasonofIndecent", Me.txtReasonofIndecent.Text.Trim)
                cmd.Parameters.AddWithValue("@DocName", Me.txtDocName.Text.Trim)
                cmd.Parameters.AddWithValue("@DateofMedicalExamination", Me.DTPDateofMedicalExamination.Value)
                cmd.Parameters.AddWithValue("@TypeofCertificate", Me.CombTypeofCertificate.SelectedItem)
                cmd.Parameters.AddWithValue("@TypeofAdmission", Me.CombTypeofAdmission.SelectedItem)
                cmd.Parameters.AddWithValue("@TuitionFees", Me.txtTuitionFees.Text.Trim)
                cmd.Parameters.AddWithValue("@WrTuitionFees", Me.txtWrTuitionFees.Text.Trim)
                cmd.Parameters.AddWithValue("@RegFees", Me.txtRegFees.Text.Trim)
                cmd.Parameters.AddWithValue("@WrRegFees", Me.txtWrRegFees.Text.Trim)
                cmd.Parameters.AddWithValue("@InvoiceNo", Me.txtInvoiceNo.Text.Trim)
                cmd.Parameters.AddWithValue("@InvoiceDate", Me.DTPInvoiceDate.Value)
                cmd.Parameters.AddWithValue("@AccName", Me.txtAccName.Text.Trim)
                cmd.Parameters.AddWithValue("@RegName", Me.txtRegName.Text.Trim)
                cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)

                SNo = CInt(cmd.ExecuteScalar())

                'Add Note to Know Start Quotation Date
                cmd.CommandText = "Insert Into Registration (SNo,stdName,Program,semtir,FileNo,UniID,Nationality,SavedUser) Values " & _
                                  "(@SNo,@studName,@Programm,@semtire,@FileN0,@UnivID,@Nationalty,@SaveUser)"

                'Add Values
                cmd.Parameters.AddWithValue("@SNo", SNo)
                cmd.Parameters.AddWithValue("@studName", Me.txtStName.Text.Trim)
                cmd.Parameters.AddWithValue("@Programm", Me.CombProgram.SelectedItem)
                cmd.Parameters.AddWithValue("@semtire", Me.txtClassroom.Text.Trim)
                cmd.Parameters.AddWithValue("@FileN0", Me.txtFileNo.Text.Trim)
                cmd.Parameters.AddWithValue("@UniID", Me.txtUniversityID.Text.Trim)
                cmd.Parameters.AddWithValue("@Nationalty", Me.CombNationality.Text.Trim)
                cmd.Parameters.AddWithValue("@SaveUser", CurrentUser)
                cmd.ExecuteNonQuery()

                Trans.Commit()
                cnn.Close()

                Clear()

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Clear()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Me.Close()
    End Sub

    Private Sub txtUniversityID_TextChanged_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtUniversityID.TextChanged
        Me.txtUniID.Text = Me.txtUniversityID.Text
    End Sub

    Private Sub txtTuitionFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtTuitionFees.TextChanged
        Me.txtAccTuitionFees.Text = Me.txtTuitionFees.Text
    End Sub

    Private Sub txtRegFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtRegFees.TextChanged
        Me.txtAccRegFees.Text = Me.txtAccRegFees.Text
    End Sub
End Class