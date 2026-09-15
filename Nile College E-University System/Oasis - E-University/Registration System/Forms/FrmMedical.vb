Imports EgyCurr.CurText
Imports System.Data.SqlClient

Public Class FrmMedical
    Sub clear()
        Me.TxtFAR.Clear()
        Me.TxtSAr.Clear()
        Me.TxtTHAr.Clear()
        Me.TxtForAr.Clear()
        Me.CombColeg.SelectedIndex = Nothing
        Me.CombProgram.SelectedIndex = Nothing
        Me.DTPDateofMedicalExamination.Value = Now
        Me.CombHepatitis.SelectedIndex = -1
        Me.CombAids.SelectedIndex = -1
        Me.CombBloodType.SelectedIndex = -1
       
        Me.txtUniversityID.Clear()
        'Me.CombAids.Visible = False
        'Me.Label8.Visible = False
    End Sub

    Sub FillStdData()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("select * from StdData where StdId=@StdId and StdId is not null", cnn)
            Dim reader As SqlDataReader
            Me.TxtForAr.Clear()
            Me.TxtFAR.Clear()
            Me.TxtTHAr.Clear()
            Me.TxtSAr.Clear()

            Me.CombProgram.SelectedIndex = -1
            Me.CombColeg.SelectedIndex = -1

            cnn.Open()
            cmd.Parameters.AddWithValue("@StdId", Me.txtUniversityID.Text)
            reader = cmd.ExecuteReader
            While reader.Read
                Me.TxtFAR.Text = reader.Item("StdFirName")
                Me.TxtTHAr.Text = reader.Item("StdTheName")
                Me.TxtSAr.Text = reader.Item("StdSecName")
                Me.TxtForAr.Text = reader.Item("StdForName")
                Me.CombColeg.Text = reader.Item("StdColg")
                Me.CombProgram.Text = reader.Item("StdProgram")
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

    Private Sub FrmMedical_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
        Me.WindowState = FormWindowState.Maximized
        'Me.CombAids.Visible = False
        'Me.Label8.Visible = False
    End Sub

    Private Sub BtnClear_Click(sender As System.Object, e As System.EventArgs) Handles BtnClear.Click
        clear()
    End Sub

    Private Sub BtnClose_Click(sender As System.Object, e As System.EventArgs) Handles BtnClose.Click
        Me.Close()
    End Sub

    Private Sub BtnSave_Click(sender As System.Object, e As System.EventArgs) Handles BtnSave.Click
        Me.ErrProvider.Clear()
        If Me.TxtFAR.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtFAR, "الرجاء ادخال الاسم الاول الطالب")
            Exit Sub
        ElseIf Me.TxtSAr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtSAr, "الرجاء ادخال الاسم الثاني للطالب ")
            Exit Sub
        ElseIf Me.TxtTHAr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtTHAr, "الرجاء ادخال الاسم الثالث للطالب ")
            Exit Sub
        ElseIf Me.TxtForAr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.TxtForAr, "الرجاء ادخال الاسم الرابع للطالب ")
            Exit Sub
            'ElseIf Me.CombColeg.SelectedIndex = -1 Then
            '    Me.ErrProvider.SetError(Me.CombColeg, "الرجاء اختيار الكلية ")
            '    Exit Sub
            'ElseIf Me.CombProgram.SelectedIndex = -1 Then
            '    Me.ErrProvider.SetError(Me.CombProgram, "الرجاء اختيار البرنامج ")
            '    Exit Sub
            'ElseIf Me.CombHepatitis.SelectedIndex = -1 Then
            '    Me.ErrProvider.SetError(Me.CombHepatitis, "الرجاء اختيار نتيجة فحص الكبد ")
            '    Exit Sub
            ' ElseIf Me.CombAids.SelectedIndex = -1 And Me.CombProgram.Text = "علوم التمريض" Then
            'ElseIf Me.CombAids.SelectedIndex = -1 Then
            '    Me.ErrProvider.SetError(Me.CombAids, "الرجاء اختيار نتيجة فحص الايدز ")
            '    Exit Sub
        ElseIf Me.CombBloodType.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombBloodType, "الرجاء اختيار نتيجة فحص الدم ")
            Exit Sub
       

        Else
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand
            Dim Trans As SqlTransaction

            cnn.Open()
            cmd.Connection = cnn
            Trans = cnn.BeginTransaction
            cmd.Transaction = Trans

                cmd.CommandText = "Insert Into MedicalExamination (UniversityID,DateofMedicalExamination,Hepatitis,Aids,BooldType,Employee) Values " & _
                              "(@UniversityID,@DateofMedicalExamination,@Hepatitis,@Aids,@BooldType,@Employee)"


            cmd.Parameters.Clear()
            cmd.Parameters.AddWithValue("@UniversityID", Me.txtUniversityID.Text)
            cmd.Parameters.AddWithValue("@DateofMedicalExamination", CDate(Me.DTPDateofMedicalExamination.Value.ToString))
                cmd.Parameters.AddWithValue("@Hepatitis", Me.CombHepatitis.Text)
            cmd.Parameters.AddWithValue("@Aids", Me.CombAids.Text)
                cmd.Parameters.AddWithValue("@Employee", CurrentUser)
                cmd.Parameters.AddWithValue("@BooldType", Me.CombBloodType.Text)
            cmd.ExecuteNonQuery()


            Trans.Commit()
            cnn.Close()

            MsgBox("Saved Successfully!")

            clear()

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

    Private Sub Button1_Click(sender As System.Object, e As System.EventArgs) Handles Button1.Click
        SelStudID = ""

        Dim a As New FrmSerchUNid
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtUniversityID.Text = SelStudID
        FillStdData()
    End Sub

    Private Sub CombColeg_SelectedIndexChanged(sender As System.Object, e As System.EventArgs) Handles CombColeg.SelectedIndexChanged
        'If Me.CombColeg.Text = "علوم التمريض" Then
        '    Me.CombAids.Visible = True
        '    Me.Label8.Visible = True
        'End If
    End Sub

    Private Sub CombProgram_SelectedIndexChanged(sender As System.Object, e As System.EventArgs) Handles CombProgram.SelectedIndexChanged

    End Sub

    Private Sub txtUniversityID_KeyPress(sender As System.Object, e As System.Windows.Forms.KeyPressEventArgs) Handles txtUniversityID.KeyPress
        'Me.CombAids.Visible = False
        'Me.Label8.Visible = False
    End Sub

 
    Private Sub txtUniversityID_TextChanged(sender As System.Object, e As System.EventArgs) Handles txtUniversityID.TextChanged
        FillStdData()
    End Sub
End Class