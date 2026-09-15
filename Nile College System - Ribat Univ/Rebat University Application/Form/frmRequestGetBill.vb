Imports System.Data.SqlClient
Imports EgyCurr.CurText

Public Class frmRequestGetBill

    Sub FillStudDetails()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StdName,College,Batch From StdFinancial Where StdID=" & CStr(Me.txtStudID.Text), cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.txtStudName.Text = reader.Item("StdName")
                Me.txtCollege.Text = reader.Item("College")
                Me.txtBatch.Text = reader.Item("Batch")
            End While
            cnn.Close()

            FillAcdYear()

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

    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.CombAcdYear.Items.Clear()
            Dim cmd As New SqlCommand("select Distinct AcdYear From Transactions Where Descr=N'تسجيل للعام الدراسي' " & _
                                      "and StudID=" & Me.txtStudID.Text, cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcdYear.Items.Add(rdr.Item(0))
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

    Sub Calculate()
        Try
            Dim X, X1, X2, X3, X4, X5, X6, X7 As Double
            If Me.txtAmountTusion.Text.Trim.Length <> 0 Then
                X = CDbl(Me.txtAmountTusion.Text)
            Else
                Me.txtAmountTusion.Text = 0
            End If

            If Me.txtAmountReg.Text.Trim.Length <> 0 Then
                X1 = CDbl(Me.txtAmountReg.Text)
            Else
                Me.txtAmountReg.Text = 0
            End If

            If Me.txtStam.Text.Trim.Length <> 0 Then
                X2 = CDbl(Me.txtStam.Text)
            Else
                Me.txtStam.Text = 0
            End If



            Me.txtAmountTotal.Text = Format(CDbl(CDbl(X) + CDbl(X1) + CDbl(X2) + CDbl(X3) + _
                                            CDbl(X4) + CDbl(X5) + CDbl(X6) + CDbl(X7)), "##,###.##")
        Catch ex As Exception
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Sub Clear()
        Me.txtStudName.Clear()
        Me.txtCollege.Clear()
        Me.txtBatch.Clear()
        Me.txtAmountTotal.Clear()
        Me.txtAmountReg.Clear()
        Me.txtAmountTotal.Clear()
        Me.txtAmountTusion.Clear()
        Me.txtStam.Text = 0.5
        Me.CombAcdYear.Items.Clear()
        Me.CombSems.SelectedIndex = -1
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtStudName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStudName, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombAcdYear.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombAcdYear, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtAmountTotalWr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtAmountTotal, "الرجاء مراجعة البيانات")
            Exit Sub
        End If

        Try
            Dim SNo As Integer = GetMoveNo1()
            Dim cmd As New SqlCommand("Insert Into RequestBill (TransNO,StudID,StudName,College,Batch,AcdYear,Semster,Amount,Writting" & _
                                      ",CurrentUser,TuitionFees,RegFees,StampFees) Values (" & SNo & "," & Me.txtStudID.Text.Trim & _
                                      ",N'" & Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & "',N'" & Me.txtBatch.Text.Trim & _
                                      "',N'" & Me.CombAcdYear.SelectedItem & "',N'" & Me.CombSems.SelectedItem & _
                                      "'," & CDbl(Me.txtAmountTotal.Text.Trim) & _
                                      ",N'" & Me.txtAmountTotalWr.Text & "',N'" & CurrentUser & "'," & Me.txtAmountTusion.Text & _
                                      "," & Me.txtAmountReg.Text & "," & Me.txtStam.Text & ")", cnn)

            cnn.Open()
            cmd.ExecuteNonQuery()
            cnn.Close()

            MsgBox("                  تم الحفظ")


            PrintReqBill(SNo)

            Clear()
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub txtStudID_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStudID.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillStudDetails()
        End If
    End Sub

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtStudID.Text = SelStudID
        FillStudDetails()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Private Sub txtStudID_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStudID.TextChanged
        Clear()
    End Sub

    Private Sub txtAmountTotal_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Try
            Me.txtAmountTotalWr.Text = ChangeTo(Me.txtAmountTotal.Text)
            Me.txtAmountTotalWr.Text = Me.txtAmountTotalWr.Text.Replace(")", "")
            Me.txtAmountTotalWr.Text = Me.txtAmountTotalWr.Text.Replace("(", "")
        Catch
            Me.txtAmountTotalWr.Clear()
        End Try
    End Sub

    Private Sub txtAmountTusion_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtAmountTusion.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtAmountReg_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtAmountReg.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtStam_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStam.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtInsur_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtUniform_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txTHighForm_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtUnivForm_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtAmountTotal_TextChanged_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtAmountTotal.TextChanged
        Try
            Me.txtAmountTotalWr.Text = ChangeTo(Me.txtAmountTotal.Text)
            Me.txtAmountTotalWr.Text = Me.txtAmountTotalWr.Text.Replace(")", "")
            Me.txtAmountTotalWr.Text = Me.txtAmountTotalWr.Text.Replace("(", "")

            Calculate()
        Catch
            Me.txtAmountTotalWr.Clear()
        End Try
    End Sub

    Private Sub txtMedExam_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub
End Class