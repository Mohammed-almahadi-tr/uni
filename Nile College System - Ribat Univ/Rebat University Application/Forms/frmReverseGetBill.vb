Imports System.Data.SqlClient
Imports EgyCurr.CurText

Public Class frmReverseGetBill

    Sub Clear()
        Me.txtStudID.Clear()
        Me.txtStudName.Clear()
        Me.txtCollege.Clear()
        Me.txtBatch.Clear()
        Me.txtAcdYear.Clear()
        Me.txtMedExam.Clear()
        Me.txtTusionFees.Clear()
        Me.txtTusionFees.Clear()
        Me.txtRegFees.Clear()
        Me.txtUnivFormFees.Clear()
        Me.txtStampFees.Clear()
        Me.txtInsurFees.Clear()
        Me.txtHighFormFees.Clear()
        Me.txtUniformFees.Clear()
        Me.txtSemester.Clear()
    End Sub

    Private Sub txtBillNo_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtBillNo.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillBillDetails()
        End If
    End Sub

    Sub FillBillDetails()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StudID,StudName,College,Batch,AcdYear,Semster,TuitionFees,RegFees,Stam " & _
                                      ",MadicalInsh,MedExamFees,Clus,HiEdu,Univar From Transactions Where SNo=" & _
                                      CStr(Me.txtBillNo.Text) & " and Letter=N'" & Me.txtLetter.Text & "'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.txtStudID.Text = Reader.Item("StudID")
                Me.txtStudName.Text = Reader.Item("StudName")
                Me.txtCollege.Text = Reader.Item("College")
                Me.txtBatch.Text = Reader.Item("Batch")
                Me.txtAcdYear.Text = Reader.Item("AcdYear")
                Me.txtSemester.Text = Reader.Item("Semster")
                Me.txtTusionFees.Text = Reader.Item("TuitionFees")
                Me.txtRegFees.Text = Reader.Item("RegFees")
                Me.txtStampFees.Text = Reader.Item("Stam")
                Me.txtInsurFees.Text = Reader.Item("MadicalInsh")
                Me.txtMedExam.Text = Reader.Item("MedExamFees")
                Me.txtUniformFees.Text = Reader.Item("Clus")
                Me.txtHighFormFees.Text = Reader.Item("HiEdu")
                Me.txtUnivFormFees.Text = Reader.Item("Univar")
            End While
            cnn.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub txtReqNo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtBillNo.TextChanged
        Clear()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub TextBox1_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtLetter.KeyUp
        If e.KeyCode = Keys.Enter Then
            If Me.txtLetter.Text.Trim.Length = 0 OrElse Me.txtBillNo.Text.Trim.Length = 0 Then
                Exit Sub
            End If
            FillBillDetails()
        End If
    End Sub

    Private Sub TextBox1_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtLetter.TextChanged
        Clear()
    End Sub

    Private Sub txtTusionFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtTusionFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtRegFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtRegFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtStampFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStampFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtInsurFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtInsurFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtMedExam_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtMedExam.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtUniformFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtUniformFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtHighFormFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtHighFormFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtUnivFormFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtUnivFormFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtAmountTotal_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtAmountTotal.TextChanged
        Try
            Me.txtAmountTotalWr.Text = ChangeTo(Me.txtAmountTotal.Text)
            Me.txtAmountTotalWr.Text = Me.txtAmountTotalWr.Text.Replace(")", "")
            Me.txtAmountTotalWr.Text = Me.txtAmountTotalWr.Text.Replace("(", "")

            Calculate()
        Catch
            Me.txtAmountTotalWr.Clear()
        End Try
    End Sub

    Sub Calculate()
        Try
            Dim X, X1, X2, X3, X4, X5, X6, X7 As Double
            If Me.txtTusionFees.Text.Trim.Length <> 0 Then
                X = CDbl(Me.txtTusionFees.Text)
            Else
                Me.txtTusionFees.Text = 0
            End If

            If Me.txtRegFees.Text.Trim.Length <> 0 Then
                X1 = CDbl(Me.txtRegFees.Text)
            Else
                Me.txtRegFees.Text = 0
            End If

            If Me.txtStampFees.Text.Trim.Length <> 0 Then
                X2 = CDbl(Me.txtStampFees.Text)
            Else
                Me.txtStampFees.Text = 0
            End If

            If Me.txtInsurFees.Text.Trim.Length <> 0 Then
                X3 = CDbl(Me.txtInsurFees.Text)
            Else
                Me.txtInsurFees.Text = 0
            End If

            If Me.txtHighFormFees.Text.Trim.Length <> 0 Then
                X4 = CDbl(Me.txtHighFormFees.Text)
            Else
                Me.txtHighFormFees.Text = 0
            End If

            If Me.txtUniformFees.Text.Trim.Length <> 0 Then
                X5 = CDbl(Me.txtUniformFees.Text)
            Else
                Me.txtUniformFees.Text = 0
            End If
            If Me.txtUnivFormFees.Text.Trim.Length <> 0 Then
                X6 = CDbl(Me.txtUnivFormFees.Text)
            Else
                Me.txtUnivFormFees.Text = 0
            End If

            If Me.txtMedExam.Text.Trim.Length <> 0 Then
                X7 = CDbl(Me.txtMedExam.Text)
            Else
                Me.txtMedExam.Text = 0
            End If

            Me.txtAmountTotal.Text = Format(CDbl(CDbl(X) + CDbl(X1) + CDbl(X2) + CDbl(X3) + _
                                            CDbl(X4) + CDbl(X5) + CDbl(X6) + CDbl(X7)), "##,###.##")

        Catch ex As Exception
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtLetter.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtLetter, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtBillNo.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtBillNo, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtStudName.Text.Trim.Length = 0 Then
            MsgBox("الرجاء مراجعة البيانات")
            Exit Sub
        Else
            Try
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Update Transactions Set " & _
                                          "TuitionFees=0,RegFees=0,Stam=0,MadicalInsh=0," & _
                                          "MedExamFees=0,Clus= 0,HiEdu=0,Univar=0 " & _
                                          "Where Letter=N'" & Me.txtLetter.Text.Trim & "' and SNo=" & Me.txtBillNo.Text, cnn)

                Dim cmd1 As New SqlCommand("Update Transactions Set " & _
                                           "TotalValueIn =0," & _
                                           "TotalValueOut =0 Where " & _
                                           "MoveNo In (Select MoveNo From Transactions Where " & _
                                           "Letter=N'" & Me.txtLetter.Text.Trim & "' and SNo=" & Me.txtBillNo.Text & ")", cnn)

                cnn.Open()
                cmd.ExecuteNonQuery()
                cmd1.ExecuteNonQuery()
                cnn.Close()

                MsgBox("تم العكس بنجاح")
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

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        If Me.txtStudID.Text.Trim.Length = 0 Then
            Exit Sub
        Else
            Me.Cursor = Cursors.WaitCursor
            PrintStudentStatement(CInt(Me.txtStudID.Text))
            Me.Cursor = Cursors.Default
        End If
    End Sub
End Class