Imports System.Data.SqlClient
Imports EgyCurr.CurText

Public Class frmGetBill

    Sub FillReqDetails()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("Select StudID,StudName,College,Batch,AcdYear,Semster,TuitionFees,RegFees,StampFees " & _
                                      ",InsurFees,MedExamFees,UniformFees,HighFormFees,UnivFormFees From RequestBill Where TransNo=" & _
                                      CStr(Me.txtReqNo.Text), cnn)
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
                Me.txtStampFees.Text = Reader.Item("StampFees")
                Me.txtInsurFees.Text = Reader.Item("InsurFees")
                Me.txtMedExam.Text = Reader.Item("MedExamFees")
                Me.txtUniformFees.Text = Reader.Item("UniformFees")
                Me.txtHighFormFees.Text = Reader.Item("HighFormFees")
                Me.txtUnivFormFees.Text = Reader.Item("UnivFormFees")
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

    Private Sub GtxtMoneyValue_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtTusionFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub

    Sub Clear()
        Me.txtStudID.Clear()
        Me.txtStudName.Clear()
        Me.txtCollege.Clear()
        Me.txtBatch.Clear()
        Me.txtAcdYear.Clear()
        Me.txtMedExam.Clear()
        Me.txtTusionFees.Clear()
        Me.CombCollecter.SelectedIndex = -1
        Me.CombBank.SelectedIndex = -1
        Me.txtCheqNo.Clear()
        Me.txtBillSNo.Clear()
        Me.txtTusionFees.Clear()
        Me.txtRegFees.Clear()
        Me.txtUnivFormFees.Clear()
        Me.txtStampFees.Clear()
        Me.txtInsurFees.Clear()
        Me.txtHighFormFees.Clear()
        Me.txtUniformFees.Clear()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtStudName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStudName, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtAcdYear.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtAcdYear, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtSemester.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtSemester, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtTusionFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtTusionFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtRegFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtRegFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtAmountTotalWr.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtAmountTotal, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtBillSNo.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtBillSNo, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombCollecter.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombCollecter, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombBank.SelectedIndex = -1 Then
            Me.ErrProvider.SetError(Me.CombBank, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtCheqNo.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtCheqNo, "الرجاء مراجعة البيانات")
            Exit Sub
        End If

        Try
            Me.Cursor = Cursors.WaitCursor
            'If ValBillSNo(CInt(Me.txtBillSNo.Text)) = False Then
            '    Me.txtBillSNo.Clear()
            '    Me.txtBillSNo.Focus()
            '    Me.Cursor = Cursors.Default
            '    Exit Sub
            'End If
            '******************************************
            Dim GetBillSNo As Integer = GetDocSNo(Me.CombCollecter.SelectedItem)
            Dim SNo As Integer = GetMoveNo()

            If GetBillSNo = 0 Then
                Me.Cursor = Cursors.Default
                MsgBox("لقد إنتهت كمية الإيصالات المصرح بها")
                Exit Sub
            End If

            Dim cmd As New SqlCommand("Insert Into Transactions (MoveNo,TransType,Letter,SNo,BillSNo,BillDate," & _
                                      "Collector,ReqNo,StudID,StudName,College,Batch,AcdYear,Semster,TuitionFees,RegFees," & _
                                      "Writting,CurrentUser,ChNo,Stam,MadicalInsh,Clus,HiEdu,Univar,MedExamFees,TransDate) " & _
                                      "Values (" & SNo & ",N'سند قبض',N'" & SNLetter & "'," & GetBillSNo & "," & Me.txtBillSNo.Text & _
                                      ",N'" & Me.DTBillDate.Value.ToShortDateString & "',N'" & Me.CombCollecter.SelectedItem & _
                                      "'," & Me.txtReqNo.Text.Trim & _
                                      "," & Me.txtStudID.Text.Trim & ",N'" & Me.txtStudName.Text.Trim & "',N'" & _
                                      Me.txtCollege.Text.Trim & "',N'" & Me.txtBatch.Text.Trim & "',N'" & _
                                      Me.txtAcdYear.Text & "',N'" & Me.txtSemester.Text.Trim & "'," & _
                                      Me.txtTusionFees.Text.Trim & "," & Me.txtRegFees.Text.Trim & _
                                      ",N'" & Me.txtAmountTotalWr.Text & "',N'" & CurrentUser & "',N'" & _
                                      Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "'," & Me.txtStampFees.Text & _
                                       "," & Me.txtInsurFees.Text & "," & Me.txtUniformFees.Text & "," & Me.txtHighFormFees.Text & _
                                       "," & Me.txtUnivFormFees.Text & "," & Me.txtMedExam.Text & ",N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd1 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,TotalValueOut,Writting,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                     "Values (" & SNo & ",N'رسوم التسجيل'," & CDbl(Me.txtAmountTotal.Text.Trim) & ",N'" & _
                                     Me.txtAmountTotalWr.Text.Trim & "',N'حسابات النقدية',N'" & _
                                     Me.CombBank.SelectedItem & "',N'" & CurrentUser & "',N'" & _
                                     Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd2 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,StudID,StudName,College,Batch,AcdYear,Semster" & _
                                       ",TotalValueIn,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                     "Values (" & SNo & ",N'الرسوم الدراسية'," & Me.txtStudID.Text.Trim & ",N'" & _
                                     Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                     "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.txtAcdYear.Text & _
                                     "',N'" & Me.txtMedExam.Text.Trim & "'," & CDbl(Me.txtTusionFees.Text.Trim) & _
                                     ",N'الإيرادات',N'الرسوم الدراسية',N'" & CurrentUser & "',N'" & _
                                     Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd3 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,StudID,StudName,College,Batch,AcdYear,Semster" & _
                                       ",TotalValueIn,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                    "Values (" & SNo & ",N'رسوم التسجيل'," & Me.txtStudID.Text.Trim & ",N'" & _
                                    Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                    "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.txtAcdYear.Text & _
                                    "',N'" & Me.txtMedExam.Text.Trim & "'," & CDbl(Me.txtRegFees.Text.Trim) & _
                                    ",N'الإيرادات',N'رسوم التسجيل',N'" & CurrentUser & "',N'" & _
                                    Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd4 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,StudID,StudName,College,Batch,AcdYear,Semster" & _
                                    ",TotalValueIn,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                 "Values (" & SNo & ",N'رسوم التسجيل'," & Me.txtStudID.Text.Trim & ",N'" & _
                                 Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                 "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.txtAcdYear.Text & _
                                 "',N'" & Me.txtMedExam.Text.Trim & "'," & CDbl(Me.txtStampFees.Text.Trim) & _
                                 ",N'الإيرادات',N'رسوم الدمغة',N'" & CurrentUser & "',N'" & _
                                 Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd5 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,StudID,StudName,College,Batch,AcdYear,Semster" & _
                                    ",TotalValueIn,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                 "Values (" & SNo & ",N'رسوم التسجيل'," & Me.txtStudID.Text.Trim & ",N'" & _
                                 Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                 "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.txtAcdYear.Text & _
                                 "',N'" & Me.txtMedExam.Text.Trim & "'," & CDbl(Me.txtInsurFees.Text.Trim) & _
                                 ",N'الإيرادات',N'رسوم التأمين',N'" & CurrentUser & "',N'" & _
                                 Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd6 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,StudID,StudName,College,Batch,AcdYear,Semster" & _
                                    ",TotalValueIn,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                 "Values (" & SNo & ",N'رسوم التسجيل'," & Me.txtStudID.Text.Trim & ",N'" & _
                                 Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                 "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.txtAcdYear.Text & _
                                 "',N'" & Me.txtMedExam.Text.Trim & "'," & CDbl(Me.txtUniformFees.Text.Trim) & _
                                 ",N'الإيرادات',N'رسوم الزي الجامعي',N'" & CurrentUser & "',N'" & _
                                 Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd7 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,StudID,StudName,College,Batch,AcdYear,Semster" & _
                                    ",TotalValueIn,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                 "Values (" & SNo & ",N'رسوم التسجيل'," & Me.txtStudID.Text.Trim & ",N'" & _
                                 Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                 "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.txtAcdYear.Text & _
                                 "',N'" & Me.txtMedExam.Text.Trim & "'," & CDbl(Me.txtHighFormFees.Text.Trim) & _
                                 ",N'الإيرادات',N'رسوم إستمارة التعليم العالي',N'" & CurrentUser & "',N'" & _
                                 Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd8 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,StudID,StudName,College,Batch,AcdYear,Semster" & _
                                    ",TotalValueIn,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                 "Values (" & SNo & ",N'رسوم التسجيل'," & Me.txtStudID.Text.Trim & ",N'" & _
                                 Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                 "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.txtAcdYear.Text & _
                                 "',N'" & Me.txtMedExam.Text.Trim & "'," & CDbl(Me.txtUnivFormFees.Text.Trim) & _
                                 ",N'الإيرادات',N'رسوم إستمارة الجامعة',N'" & CurrentUser & "',N'" & _
                                 Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            Dim cmd9 As New SqlCommand("Insert Into Transactions (MoveNo,Descr,StudID,StudName,College,Batch,AcdYear,Semster" & _
                                    ",TotalValueIn,Acc1,Acc2,CurrentUser,ChNo,TransDate) " & _
                                 "Values (" & SNo & ",N'رسوم التسجيل'," & Me.txtStudID.Text.Trim & ",N'" & _
                                 Me.txtStudName.Text.Trim & "',N'" & Me.txtCollege.Text.Trim & _
                                 "',N'" & Me.txtBatch.Text.Trim & "',N'" & Me.txtAcdYear.Text & _
                                 "',N'" & Me.txtMedExam.Text.Trim & "'," & CDbl(Me.txtMedExam.Text.Trim) & _
                                 ",N'الإيرادات',N'رسوم الكشف الطبي',N'" & CurrentUser & "',N'" & _
                                 Me.CombBank.SelectedItem & " - " & Me.txtCheqNo.Text.Trim & "',N'" & Me.DTBillDate.Value & "')", cnn)

            cnn.Open()
            cmd.ExecuteNonQuery()
            cmd1.ExecuteNonQuery()

            If Me.txtTusionFees.Text <> "0" Then
                cmd2.ExecuteNonQuery()
            End If

            If Me.txtRegFees.Text <> "0" Then
                cmd3.ExecuteNonQuery()
            End If

            If Me.txtStampFees.Text <> "0" Then
                cmd4.ExecuteNonQuery()
            End If

            If Me.txtInsurFees.Text <> "0" Then
                cmd5.ExecuteNonQuery()
            End If

            If Me.txtMedExam.Text <> "0" Then
                cmd9.ExecuteNonQuery()
            End If

            If Me.txtUniformFees.Text <> "0" Then
                cmd6.ExecuteNonQuery()
            End If

            If Me.txtHighFormFees.Text <> "0" Then
                cmd7.ExecuteNonQuery()
            End If

            If Me.txtUnivFormFees.Text <> "0" Then
                cmd8.ExecuteNonQuery()
            End If
            cnn.Close()

            MsgBox("تم الحفظ")

            PrintBill("سند قبض", SNLetter, GetBillSNo)
            Clear()
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

    Private Function ValBillSNo(ByVal BillSNo As Integer) As Boolean
        Try
            Dim cmd As New SqlCommand("Select Count(*) From BillSNo Where " & BillSNo & " Between SFrom and STo", cnn1)
            Dim cmd1 As New SqlCommand("Select Count(*) From Transactions Where BillSNo=" & BillSNo, cnn1)
            Dim X, X1 As Boolean

            cnn1.Open()
            X = CBool(cmd.ExecuteScalar.ToString)
            X1 = CBool(cmd1.ExecuteScalar.ToString)
            cnn1.Close()

            If X = False Then
                MsgBox("رقم الإيصال غير موجود بالنظام")
                Return False
            ElseIf X1 = True Then
                MsgBox("رقم الإيصال مستخدم من قبل")
                Return False
            End If

            Return True
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Private Sub frmGetBill_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.CombBank.Items.Clear()
            Dim cmd As New SqlCommand("Select Distinct Acc2 From Accounts Where Acc1=N'حسابات النقدية'", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombBank.Items.Add(rdr.Item(0))
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

        FillCollectors()
    End Sub

    Sub FillCollectors()
        Try
            Dim CollectorsList As New ArrayList
            CollectorsList = GetCollectorsList()
            Me.CombCollecter.Items.Clear()

            For Each CollegeName As String In CollectorsList
                Me.CombCollecter.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub txtAmountReg_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtRegFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtAmountOther_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
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

    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.txtStudID.Text = SelStudID
        FillReqDetails()
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

    Private Sub CombBank_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombBank.SelectedIndexChanged
        If Me.CombBank.SelectedIndex = -1 Then
            Me.txtCheqNo.Clear()
        ElseIf Me.CombBank.SelectedItem = "الخزينة" Then
            Me.txtCheqNo.Text = "-"
        End If
    End Sub

    Private Sub txtStam_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtMadicalInsh_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtInsurFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtClus_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtUniformFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txTHiEdu_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtHighFormFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub txtUnivar_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtUnivFormFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub TextBox1_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtReqNo.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillReqDetails()
        End If
    End Sub

    Private Sub TextBox1_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtReqNo.TextChanged
        Clear()
    End Sub

    Private Sub txtMedExam_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtMedExam.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub

    Private Sub Button4_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        Try
            Dim str As String
            str = InputBox("الرجاء إدخال إسم المتحصل")

            If Trim(str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into Collectors (Collector) Values(N'" & str & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillCollectors()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Private Sub txtStampFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStampFees.TextChanged
        Try
            Calculate()
        Catch
            Me.txtAmountTotal.Clear()
        End Try
    End Sub
End Class